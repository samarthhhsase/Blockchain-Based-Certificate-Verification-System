export default function Card({ children, className = "", ...props }) {
  return (
    <section
      className={`rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
