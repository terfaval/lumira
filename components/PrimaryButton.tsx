"use client";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #ccc",
        cursor: "pointer",
        fontWeight: 600,
        opacity: props.disabled ? 0.6 : 1,
      }}
    />
  );
}
