/* eslint-disable react/prop-types */
import { Box, Typography } from '@mui/material';

const BreakingNewsBanner = ({ headlines = [] }) => {
  if (!headlines.length) return null;

  const ticker = [
    'ULTIMA HORA',
    ...headlines.map((item) => item.toUpperCase()),
    'ULTIMA HORA',
    ...headlines.map((item) => item.toUpperCase()),
  ];

  return (
    <Box className="breaking-banner" role="region" aria-label="Titulares de ultima hora">
      <Box className="breaking-tag">ULTIMA HORA</Box>
      <Box className="breaking-marquee-wrap">
        <Box className="marquee-track">
          {ticker.map((item, index) => (
            <Typography key={`${item}-${index}`} component="span" className="breaking-item">
              {item}
            </Typography>
          ))}
        </Box>
      </Box>
      <Box className="breaking-tag">ULTIMA HORA</Box>
    </Box>
  );
};

export default BreakingNewsBanner;
