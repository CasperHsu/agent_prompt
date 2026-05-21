"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createContract } from "@/app/actions/admin";

type TemplateField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "textarea";
  required: boolean;
  placeholder?: string;
};

type TemplateOption = {
  id: string;
  name: string;
  type: "contractor" | "course";
  verificationLevel: "basic" | "medium" | "strong";
  requireTsa: boolean;
  requiredFields: TemplateField[];
};

export function NewContractForm({ templates }: { templates: TemplateOption[] }) {
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ signingUrl: string; expiresAt: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!selected) {
      setError("請選擇範本");
      return;
    }

    startTransition(async () => {
      try {
        const r = await createContract({
          templateId: selected.id,
          title: title || `${selected.name} - ${signerName}`,
          signerName,
          signerEmail,
          signerPhone: signerPhone || null,
          variables: values,
        });
        setResult({ signingUrl: r.signingUrl, expiresAt: r.expiresAt });
      } catch (e) {
        setError(e instanceof Error ? e.message : "建立失敗");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. 選擇範本</CardTitle>
          <CardDescription>
            不同範本對應不同驗證強度與時戳設定。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplateId(t.id);
                  setValues({});
                }}
                className={`rounded-md border p-3 text-left text-sm transition-colors ${
                  templateId === t.id
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <div className="font-medium">{t.name}</div>
                <div className="mt-1 flex gap-1 text-xs">
                  <Badge variant="outline">
                    {t.type === "contractor" ? "承攬" : "課程"}
                  </Badge>
                  <Badge variant="secondary">
                    {t.verificationLevel === "basic"
                      ? "基本驗證"
                      : t.verificationLevel === "medium"
                      ? "中等驗證"
                      : "強驗證"}
                  </Badge>
                  {t.requireTsa && <Badge variant="success">TSA</Badge>}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. 簽署人資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="合約標題（顯示於簽署頁）"
            value={title}
            onChange={setTitle}
            placeholder={selected ? `${selected.name} - ${signerName || "簽署人"}` : ""}
          />
          <Field label="簽署人姓名" value={signerName} onChange={setSignerName} required />
          <Field
            label="Email"
            type="email"
            value={signerEmail}
            onChange={setSignerEmail}
            required
          />
          <Field label="手機（選填，用於 SMS OTP）" value={signerPhone} onChange={setSignerPhone} />
        </CardContent>
      </Card>

      {selected && selected.requiredFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. 合約變數</CardTitle>
            <CardDescription>填入後會自動套入合約範本中對應的 {"{{key}}"} 位置。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected.requiredFields.map((f) => (
              <DynamicField
                key={f.key}
                field={f}
                value={values[f.key] ?? ""}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result ? (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle>合約已建立</CardTitle>
            <CardDescription>請將下方簽署連結交付給簽署人</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm font-mono break-all">
              {result.signingUrl}
            </div>
            <div className="text-xs text-zinc-500">
              連結有效期至：{new Date(result.expiresAt).toLocaleString("zh-TW")}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(result.signingUrl)}
              >
                複製連結
              </Button>
              <a href={result.signingUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary">
                  開啟簽署頁
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "建立中..." : "建立合約"}
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="ml-1 text-red-600">*</span>}
        </Label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      </div>
    );
  }
  return (
    <Field
      label={field.label}
      value={value}
      onChange={onChange}
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
      required={field.required}
      placeholder={field.placeholder}
    />
  );
}
