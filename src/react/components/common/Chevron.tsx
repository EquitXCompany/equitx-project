import Icon from '@mui/material/Icon';

type ChevronProps = {
  open: boolean;
  isDarkMode: boolean;
}

export default function Chevron(props: ChevronProps) {
  const { open, isDarkMode } = props;

  return (
    <Icon
      sx={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s ease',
        cursor: 'pointer',
        width: '13px',
        height: '24px',
      }}
    >
      { isDarkMode ? 
        (<img
            className="brand-chevron"
            src='/EQUITX-Chevron-White.svg'
          />
        ) : (<img
            className="brand-chevron"
            src='/EQUITX-Chevron-Black.svg'
          />
        )}
    </Icon>
  );
}