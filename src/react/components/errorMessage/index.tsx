import styles from './errorMessage.module.css';
import MuiLink from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';

interface Props {
  title: string;
  message: string;
}

export default function ErrorMessage({ title, message }: Props) {
  return (
    <li className={styles.errorMessage}>
      <MuiLink component={RouterLink} to={`/`}>
        <h2>
          {title}
        </h2>
        <p>{message}</p>
      </MuiLink>
    </li>
  );
}