import { Card, CardContent, Typography } from '@mui/material';
import { hue, lum } from '../colorMath';

interface ColorCardProps {
  name: string;
  hex: string;
}

export function ColorCard({ name, hex }: ColorCardProps) {
  return (
    <Card sx={{ backgroundColor: hex }}>
      <CardContent>
        <Typography variant="h5">{name}</Typography>
        <Typography variant="h6">{hex}</Typography>
        <Typography variant="body2">
          H: {Math.round(hue(hex))}
          <br />
          L: {Math.round(lum(hex))}
        </Typography>
      </CardContent>
    </Card>
  );
}
