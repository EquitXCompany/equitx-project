import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link } from "react-router-dom";
import Truncate from "../../components/truncate";
import type { PropsWithChildren } from "react";

interface Props extends PropsWithChildren {
  title: string;
  href: string;
}

export default function Card({ title, children, href }: Props) {
  const theme = useTheme();

  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        display: "flex",
        padding: "1px",
        backgroundColor: theme.palette.background.paper,
        boxShadow: `inset 0 0 0 1px ${
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)"
        }`,
        backgroundImage: "none",
        backgroundSize: "400%",
        borderRadius: "7px",
        backgroundPosition: "100%",
        transition: "background-position 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        "&:hover, &:focus-within": {
          backgroundPosition: 0,
          backgroundImage: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || "#8b5cf6"})`,
        },
      }}
    >
      <Box
        component={Link}
        to={href}
        sx={{
          width: "100%",
          textDecoration: "none",
          lineHeight: 1.4,
          padding: "calc(1.5rem - 1px)",
          borderRadius: "8px",
          opacity: 0.8,
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.paper,
          "& h2": {
            margin: 0,
            fontSize: "1.25rem",
            color: theme.palette.text.primary,
            transition: "color 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            "& span:last-child": {
              marginLeft: "0.25rem",
            },
          },
          "& > div": {
            marginTop: "0.5rem",
            marginBottom: 0,
            color: theme.palette.text.secondary,
          },
        }}
      >
        <h2>
          {title.length < 5 ? (
            title
          ) : (
            <Truncate clickToCopy={false}>{title}</Truncate>
          )}
          <span>&rarr;</span>
        </h2>
        <div>{children}</div>
      </Box>
    </Box>
  );
}
