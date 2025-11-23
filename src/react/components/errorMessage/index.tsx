import { Box } from "@mui/material";
import MuiLink from "@mui/material/Link";
import { Link as RouterLink } from "react-router-dom";

interface Props {
  title: string;
  message: string;
}

export default function ErrorMessage({ title, message }: Props) {
  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        display: "flex",
        padding: 2,
        backgroundColor: "var(--color-dark-blue)",
        borderRadius: "7px",
        boxShadow: "inset 0 0 0 1px rgba(242, 232, 201, 0.1)",
        mt: 2,
        "&:hover, &:focus-within": {
          backgroundImage: "var(--accent-gradient)",
          transition: "background 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        },
      }}
    >
      <MuiLink
        component={RouterLink}
        to="/"
        sx={{
          width: "100%",
          textDecoration: "none",
          lineHeight: 1.4,
          color: "var(--color-cream)",
          opacity: 0.8,
          "& h2": {
            margin: 0,
            fontSize: "1.25rem",
            color: "var(--color-cream)",
          },
          "& p": {
            marginTop: 1,
            marginBottom: 0,
          },
        }}
      >
        <h2>{title}</h2>
        <p>{message}</p>
      </MuiLink>
    </Box>
  );
}
