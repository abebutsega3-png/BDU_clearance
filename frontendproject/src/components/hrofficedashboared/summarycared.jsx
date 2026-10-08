import React from "react";
import { Link } from "react-router-dom";
import { useHRLanguage } from "./HRLanguage";

function SummaryCard({
  icon: Icon,
  title,
  value,
  note,
  iconClass,
  linkText,
  to,
}) {
  const { t } = useHRLanguage();

  return (
    <div
      className="
        min-w-0
        rounded-md
        border border-slate-200
        bg-white
        p-2.5
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >
      <div className="flex items-start gap-2.5">

        {/* ================= ICON ================= */}
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            ${iconClass}
          `}
        >
          <Icon className="text-base" />
        </div>

        {/* ================= CONTENT ================= */}
        <div className="min-w-0 flex-1">

          {/* TITLE */}
          <p
            className="
              whitespace-nowrap
              overflow-hidden
              text-ellipsis
              text-[10px]
              font-semibold
              text-slate-500
            "
          >
            {t(title)}
          </p>

          {/* VALUE */}
          <p
            className="
              mt-1
              text-base
              font-bold
              leading-tight
              text-[#10254b]
            "
          >
            {value}
          </p>

          {/* NOTE */}
          <p
            className="
              mt-1
              whitespace-nowrap
              overflow-hidden
              text-ellipsis
              text-[9px]
              leading-4
              text-slate-400
            "
          >
            {t(note)}
          </p>

          {/* LINK */}
          {linkText && (
            <Link
              to={to}
              className="
                mt-1.5
                whitespace-nowrap
                text-[9px]
                font-semibold
                text-blue-600
                hover:text-blue-700
                hover:underline
              "
            >
              {t(linkText)} →
            </Link>
          )}

        </div>
      </div>
    </div>
  );
}

export default SummaryCard;