import SvgIcon from "@mui/material/SvgIcon";

type ChevronProps = {
  open: boolean;
  isDarkMode: boolean;
};

export default function Chevron(props: ChevronProps) {
  const { open, isDarkMode } = props;

  return (
    <SvgIcon
      sx={{
        transform: open
          ? "rotate(180deg) translateX(2px)"
          : "rotate(0deg) translateX(2px)",
        transition: "transform 0.3s ease",
        color: `var(--color-text-primary-${isDarkMode ? "dark" : "light"})`,
        cursor: "pointer",
        width: "14px",
        height: "24px",
        margin: "0 5px",
      }}
    >
      <svg
        viewBox="0 0 42 75"
        width="42"
        height="75"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M40.5914 36.44C22.7414 25.24 16.8415 4.92 15.7915 0.760002C15.6815 0.320002 15.2815 0 14.8215 0H1.00144C0.351444 0 -0.128557 0.610002 0.0314429 1.24C1.38144 6.44 7.37146 26.62 21.3015 36.46C21.8815 36.87 21.8815 37.7 21.3015 38.11C7.36146 47.96 1.38144 68.19 0.0314429 73.4C-0.128557 74.03 0.341444 74.64 1.00144 74.64H14.8114C15.2714 74.64 15.6714 74.33 15.7814 73.88C16.8214 69.71 22.7315 49.33 40.5815 38.13C41.2115 37.73 41.2115 36.83 40.5815 36.43L40.5914 36.44Z"
          fill="currentColor"
        />
      </svg>
    </SvgIcon>
  );
}
