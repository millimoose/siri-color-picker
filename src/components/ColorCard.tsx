import { Card, CardContent, Typography } from '@mui/material';
import { memo } from 'react';

interface ColorCardProps {
  name: string;
  hex: string;
  hue: number;
  lum: number;
}

// Memoized: scrubbing the filters re-renders the grid constantly, but a given
// card's content is static, so identical props should bail out entirely.
export const ColorCard = memo(function ColorCard({ name, hex, hue, lum }: ColorCardProps) {
  return (
    <Card
      sx={{
        backgroundColor: hex,
        // Skip layout/paint for off-screen cards; ~size covers the collapsed gap.
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 140px',
      }}
    >
      <CardContent>
        <Typography variant="h5">{name}</Typography>
        <Typography variant="h6">{hex}</Typography>
        <Typography variant="body2">
          H: {Math.round(hue)}
          <br />
          L: {Math.round(lum)}
        </Typography>
      </CardContent>
    </Card>
  );
});
