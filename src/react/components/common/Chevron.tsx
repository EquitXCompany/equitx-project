import Icon from "@mui/material/Icon";

type ChevronProps = {
  open: boolean;
  isDarkMode: boolean;
};

export default function Chevron(props: ChevronProps) {
  const { open, isDarkMode } = props;

  return (
    <Icon
      sx={{
        transform: open
          ? "rotate(180deg) translateX(2px)"
          : "rotate(0deg) translateX(2px)",
        transition: "transform 0.3s ease",
        cursor: "pointer",
        width: "14px",
        height: "24px",
        margin: "0 5px",
      }}
    >
      {isDarkMode ? (
        <img className="brand-chevron" src="/EQUITX-Chevron-White.svg" />
      ) : (
        <img className="brand-chevron" src="/EQUITX-Chevron-Black.svg" />
      )}
    </Icon>
  );
}
