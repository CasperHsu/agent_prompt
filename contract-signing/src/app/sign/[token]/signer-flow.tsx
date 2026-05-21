"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/signature-pad";
import { requestOtp, submitOtp, submitSignature } from "@/app/actions/sign";
import { CheckCircle2, FileText, Shield, AlertTriangle } from "lucide-react";

type ContractView = {
  id: string;
  title: string;
  renderedHtml: string;
  status: string;
  signerName: string;
  signerEmailMasked: string;
  signerPhoneMasked: string | null;
  contentHash: string;
  sealHash: string | null;
  verificationLevel: "basic" | "medium" | "strong";
  signedAt: string | null;
  expiresAt: string;
};

type TemplateView = {
  name: string;
  type: "contractor" | "course";
};

type Step = "review" | "verify" | "sign" | "done";

export function SignerFlow({
  token,
  contract,
  template,
}: {
  token: string;
  contract: ContractView;
  template: TemplateView;
}) {
  const isSigned = contract.status === "signed" || !!contract.signedAt;
  const initialStep: Step = isSigned ? "done" : "review";

  const [step, setStep] = useState<Step>(initialStep);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sealHash, setSealHash] = useState<string | null>(contract.sealHash);
  const [completion, setCompletion] = useState<{
    pdfReady: boolean;
    tsaApplied: boolean;
    tsaStub: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  if (contract.status === "voided" || contract.status === "expired") {
    return (
      <FullPage>
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              <CardTitle>合約已失效</CardTitle>
            </div>
            <CardDescription>
              此簽署連結已無法使用（狀態：{contract.status}）。請聯絡寄發合約的單位。
            </CardDescription>
          </CardHeader>
        </Card>
      </FullPage>
    );
  }

  const sendOtp = (ch: "email" | "sms") => {
    setError(null);
    startTransition(async () => {
      try {
        await requestOtp(token, ch);
        setChannel(ch);
        setOtpSent(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "發送驗證碼失敗");
      }
    });
  };

  const verifyOtp = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await submitOtp({ token, channel, code: otpCode });
        if (!r.ok) {
          const map: Record<string, string> = {
            expired: "驗證碼已過期",
            invalid: "驗證碼錯誤",
            max_attempts: "嘗試次數過多，請重新發送",
            not_found: "找不到驗證碼，請重新發送",
          };
          setError(map[r.reason] ?? r.reason);
          return;
        }
        setStep("sign");
      } catch (e) {
        setError(e instanceof Error ? e.message : "驗證失敗");
      }
    });
  };

  const finalize = () => {
    if (!signatureDataUrl) {
      setError("請先簽名");
      return;
    }
    if (!consent) {
      setError("請先勾選同意條款");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const r = await submitSignature({
          token,
          signatureDataUrl,
          consentAcknowledged: true,
        });
        if ("sealHash" in r && r.sealHash) setSealHash(r.sealHash);
        if ("pdfReady" in r) {
          setCompletion({
            pdfReady: !!r.pdfReady,
            tsaApplied: !!r.tsaApplied,
            tsaStub: !!r.tsaStub,
          });
        }
        setStep("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "簽署失敗");
      }
    });
  };

  return (
    <FullPage>
      <div className="w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <FileText className="size-4" />
            <span>{template.type === "contractor" ? "承攬合約" : "課程合約"}</span>
            <span>·</span>
            <span>{template.name}</span>
            <VerificationBadge level={contract.verificationLevel} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {contract.title}
          </h1>
          <p className="text-sm text-zinc-500">
            親愛的 {contract.signerName}，請逐步完成下列簽署流程。
          </p>
        </header>

        <Stepper step={step} />

        {step === "review" && (
          <Card>
            <CardHeader>
              <CardTitle>第一步：閱讀合約內容</CardTitle>
              <CardDescription>
                請仔細閱讀以下合約全文。確認無誤後點選下一步進入身分驗證。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ContractContent html={contract.renderedHtml} />
              <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 font-mono break-all">
                文件指紋（SHA-256）：{contract.contentHash}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep("verify")}>下一步：身分驗證</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <Card>
            <CardHeader>
              <CardTitle>第二步：身分驗證</CardTitle>
              <CardDescription>
                請選擇驗證管道接收一次性驗證碼，並輸入完成驗證。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!otpSent ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => sendOtp("email")}
                    disabled={pending}
                  >
                    寄送至 Email（{contract.signerEmailMasked}）
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendOtp("sms")}
                    disabled={pending || !contract.signerPhoneMasked}
                  >
                    {contract.signerPhoneMasked
                      ? `傳送至手機（${contract.signerPhoneMasked}）`
                      : "未設定手機"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    驗證碼已寄出至{" "}
                    {channel === "email"
                      ? contract.signerEmailMasked
                      : contract.signerPhoneMasked}
                    ，10 分鐘內有效。
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp">驗證碼（6 碼）</Label>
                    <Input
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="font-mono tracking-widest text-center text-lg"
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode("");
                      }}
                    >
                      重新選擇管道
                    </Button>
                    <Button
                      onClick={verifyOtp}
                      disabled={otpCode.length !== 6 || pending}
                    >
                      驗證
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "sign" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <CardTitle>第三步：簽名與確認</CardTitle>
              </div>
              <CardDescription>
                請在框內簽名，並勾選下方確認條款後送出。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignaturePad onChange={setSignatureDataUrl} />
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-zinc-700">
                  本人{contract.signerName}已閱讀並理解上述合約全部內容，
                  確認以本人意願簽署本電子契約，並同意依《電子簽章法》規定，
                  本電子簽章與書面簽名具同等法律效力。
                </span>
              </label>
              <div className="flex justify-end">
                <Button
                  onClick={finalize}
                  disabled={!signatureDataUrl || !consent || pending}
                >
                  確認簽署
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-6 text-green-600" />
                <CardTitle>合約已完成簽署</CardTitle>
              </div>
              <CardDescription>
                我們已紀錄完整稽核軌跡，並將寄送一份副本至您的信箱。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2">
                <Row label="簽署人" value={contract.signerName} />
                <Row label="文件指紋" mono value={contract.contentHash} />
                {sealHash && <Row label="封存指紋" mono value={sealHash} />}
                {contract.signedAt && (
                  <Row
                    label="簽署時間"
                    value={new Date(contract.signedAt).toLocaleString("zh-TW")}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {(completion?.pdfReady ?? true) && (
                  <a
                    href={`/api/sign/${token}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button type="button" variant="default" size="sm">
                      下載簽署完成 PDF
                    </Button>
                  </a>
                )}
                {completion?.tsaApplied && (
                  <a
                    href={`/api/sign/${token}/timestamp`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button type="button" variant="outline" size="sm">
                      下載 TSA 時戳 (.tsr)
                    </Button>
                  </a>
                )}
                <a
                  href={`/api/sign/${token}/verify`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button type="button" variant="ghost" size="sm">
                    完整性驗證 (JSON)
                  </Button>
                </a>
              </div>

              {completion?.tsaStub && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  本次簽署使用開發模式 stub 時戳，僅作示意，不具法律效力。
                  正式環境請設定 TWCA_TSA_URL 等變數啟用真實 RFC 3161 時戳。
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <footer className="text-center text-xs text-zinc-400">
          本系統依《電子簽章法》設計，所有操作均留存稽核軌跡作為日後爭議舉證之用。
        </footer>
      </div>
    </FullPage>
  );
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
      {children}
    </div>
  );
}

function ContractContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none rounded-md border border-zinc-200 bg-white p-6 leading-relaxed [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mt-2 [&_h2]:mt-4 [&_h3]:mt-3 [&_h1]:mb-3 [&_h2]:mb-2 [&_h3]:mb-2 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="w-20 shrink-0 text-zinc-500">{label}</div>
      <div className={mono ? "font-mono break-all text-xs text-zinc-700" : "text-zinc-900"}>
        {value}
      </div>
    </div>
  );
}

function VerificationBadge({ level }: { level: "basic" | "medium" | "strong" }) {
  const map = {
    basic: { label: "基本驗證", variant: "secondary" as const },
    medium: { label: "中等驗證", variant: "warning" as const },
    strong: { label: "強驗證", variant: "success" as const },
  };
  const v = map[level];
  return (
    <Badge variant={v.variant} className="ml-1 inline-flex items-center gap-1">
      <Shield className="size-3" />
      {v.label}
    </Badge>
  );
}

function Stepper({ step }: { step: Step }) {
  const items: { key: Step; label: string }[] = [
    { key: "review", label: "閱讀合約" },
    { key: "verify", label: "身分驗證" },
    { key: "sign", label: "簽署" },
    { key: "done", label: "完成" },
  ];
  const order = items.findIndex((i) => i.key === step);

  return (
    <ol className="flex items-center gap-2 text-xs">
      {items.map((item, idx) => {
        const isActive = idx === order;
        const isDone = idx < order || step === "done";
        return (
          <li key={item.key} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-medium ${
                isDone
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : isActive
                  ? "border-zinc-900 text-zinc-900"
                  : "border-zinc-300 text-zinc-400"
              }`}
            >
              {idx + 1}
            </span>
            <span
              className={
                isActive || isDone ? "text-zinc-900" : "text-zinc-400"
              }
            >
              {item.label}
            </span>
            {idx < items.length - 1 && <span className="mx-1 text-zinc-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
