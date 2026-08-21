import { Avatar } from '@mui/material';
import { colorForIndex, initials } from '../palette.js';

export default function PlayerAvatar({ name, colorIndex = 0, size = 32 }) {
  const color = colorForIndex(colorIndex);
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 700,
        bgcolor: `${color}1a`,
        color,
      }}
    >
      {initials(name)}
    </Avatar>
  );
}
