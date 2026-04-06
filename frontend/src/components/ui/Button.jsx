const baseStyles =
  "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary:
    "bg-gradient-to-r from-[#0B5ED7] to-[#0A3D62] text-white shadow-[0_10px_24px_rgba(11,94,215,0.28)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(11,94,215,0.32)] focus-visible:ring-[#0B5ED7]",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md focus-visible:ring-slate-400",
  danger:
    "bg-[#DC3545] text-white shadow-[0_10px_24px_rgba(220,53,69,0.22)] hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[0_14px_28px_rgba(220,53,69,0.28)] focus-visible:ring-[#DC3545]",
};

export default function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  ...props
}) {
  const style = variants[variant] || variants.primary;

  return (
    <button type={type} className={`${baseStyles} ${style} ${className}`} {...props}>
      {children}
    </button>
  );
}
