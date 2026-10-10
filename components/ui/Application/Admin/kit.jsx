// Admin UI kit — same look as the 360 (AmarSolution-style) project:
// flat white cards, green table heads (#00801a), grey totals row,
// solid 6px-radius buttons and 38px inputs.

const BTN =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] border text-[13px] leading-[19.5px] text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

export const btn = {
  primary: `${BTN} border-[#188ae2] bg-[#188ae2] px-[14px] py-[7px] hover:border-[#1379c7] hover:bg-[#1379c7]`,
  info: `${BTN} border-[#35b8e0] bg-[#35b8e0] px-[14px] py-[7px] hover:border-[#22a6cf] hover:bg-[#22a6cf]`,
  warning: `${BTN} border-[#f9c851] bg-[#f9c851] px-[14px] py-[7px] hover:border-[#f0b93a] hover:bg-[#f0b93a]`,
  success: `${BTN} border-[#10c469] bg-[#10c469] px-[16px] py-[7px] hover:border-[#0dab5b] hover:bg-[#0dab5b]`,
  secondary: `${BTN} border-[#868e96] bg-[#868e96] px-[14px] py-[7px] hover:border-[#727b84] hover:bg-[#727b84]`,
  danger: `${BTN} border-[#ff5b5b] bg-[#ff5b5b] px-[14px] py-[7px] hover:border-[#f24242] hover:bg-[#f24242]`,
  dark: `${BTN} border-[#6c757d] bg-[#6c757d] px-[12px] py-[6px] hover:bg-[#5a6268]`,
};

export const filterInput =
  "h-[38px] w-full rounded-[6px] border border-[#e3e3e3] bg-white px-[12px] text-[13px] text-[#495057] outline-none transition focus:border-[#188ae2] focus:ring-2 focus:ring-[#188ae2]/15";
export const labelClass = "mb-[5px] block text-[13px] font-semibold text-[#343a40]";

export const theadClass = "bg-[#00801a] text-white";
export const thClass = "whitespace-nowrap border border-[#ebeff2] px-[8px] py-[7px] text-left text-[13px] font-bold text-white align-middle";
export const tdClass = "border border-[#edf0f3] px-[8px] py-[7px] text-[14px] text-[#212529] align-middle tabular-nums";
export const totalRowClass = "bg-[#cbd5e1] text-[15px] font-bold [&>td]:py-[9px]";

/** Page card with the green title bar, like 360's ListCard. */
export function ListCard({ title, actions, children, bodyClass = "p-[12px] sm:p-[20px]", className = "" }) {
  return (
    <section className={`rounded-[8px] border border-[#e6ebf1] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.04)] ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-t-[8px] border-b border-[#eef1f4] bg-gradient-to-r from-[#f7f9fb] to-white px-[14px] py-[13px] sm:px-[20px]">
        <h1 className="m-0 flex items-center gap-[10px] text-[17px] font-semibold sm:text-[19px] leading-[1.3] text-[#212529] before:block before:h-[18px] before:w-[4px] before:rounded-full before:bg-[#1bab70] before:content-['']">
          {title}
        </h1>
        {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Dashboard panel, like 360's Panel. */
export function Panel({ title, right, children, className = "" }) {
  return (
    <section className={`flex min-w-0 flex-col border border-[#eef0f3] bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)] ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f2f5] px-[16px] py-[12px]">
        <h2 className="m-0 text-[16px] font-semibold text-[#343a40]">{title}</h2>
        {right}
      </header>
      <div className="min-h-0 flex-1 p-[14px]">{children}</div>
    </section>
  );
}

/** Empty state inside a table body. */
export function EmptyRow({ colSpan, title = "No data found" }) {
  return (
    <tr>
      <td colSpan={colSpan} className="border border-[#edf0f3] py-[28px] text-center text-[14px] text-[#6c757d]">
        {title}
      </td>
    </tr>
  );
}
