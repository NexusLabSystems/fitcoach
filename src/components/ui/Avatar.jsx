// src/components/ui/Avatar.jsx
import clsx from "clsx";

const COLORS = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-yellow-100 text-yellow-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
];

function colorFromName(name = "") {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORS[code % COLORS.length];
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const SIZES = {
  sm:  "w-7 h-7 text-xs",
  md:  "w-9 h-9 text-sm",
  lg:  "w-12 h-12 text-base",
  xl:  "w-16 h-16 text-xl",
};

export default function Avatar({ name, src, size = "md", className }) {
  const sizeClass  = SIZES[size] || SIZES.md;
  const colorClass = colorFromName(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx("rounded-full object-cover flex-shrink-0", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full flex items-center justify-center font-semibold flex-shrink-0",
        sizeClass,
        colorClass,
        className
      )}
    >
      {initials(name)}
    </div>
  );
}