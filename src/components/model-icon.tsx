import Image from "next/image";

interface ModelIconProps {
  icon?: string;
  iconAlt?: string;
  initials?: string;
}

export function ModelIcon({ icon, iconAlt, initials }: ModelIconProps) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-kumo-hairline bg-kumo-tint text-kumo-default">
      {icon ? (
        <Image
          alt={iconAlt ?? ""}
          className="max-h-5 max-w-5 object-contain"
          height={20}
          src={icon}
          width={20}
        />
      ) : (
        <span className="text-sm font-medium">{initials}</span>
      )}
    </div>
  );
}
