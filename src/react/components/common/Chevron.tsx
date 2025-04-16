import Icon from '@mui/material/Icon';

type ChevronProps = {
  open: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}

export default function Chevron(props: ChevronProps) {
  const { open, onClick, isDarkMode } = props;

  return (
    <Icon
      onClick={onClick}
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
            src='../../../../public/EQUITX-Chevron-White.svg'
          />
        ) : (<img
            className="brand-chevron"
            src='../../../../public/EQUITX-Chevron-Black.svg'
          />
        )}
    </Icon>
  );
}