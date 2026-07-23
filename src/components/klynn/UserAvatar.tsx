import Avatar from "boring-avatars";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 36,
  className = ""
}: UserAvatarProps) {
  // Si tiene un avatar personalizado (que no sea el placeholder externo)
  const isCustomAvatar = avatarUrl && 
    !avatarUrl.includes("source.boringavatars.com") && 
    avatarUrl.trim() !== "" &&
    !avatarUrl.startsWith("boring");

  if (isCustomAvatar) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`object-cover rounded-full select-none ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className={`shrink-0 overflow-hidden rounded-full select-none ${className}`} style={{ width: size, height: size }}>
      <Avatar
        size={size}
        name={name || "User"}
        variant="beam"
        colors={["#f6d76b", "#ff9036", "#d6254d", "#ff5475", "#fdeba9"]}
      />
    </div>
  );
}
