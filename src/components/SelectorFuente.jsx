/* eslint-disable react/prop-types */
import { Autocomplete, Box, IconButton, SvgIcon, TextField } from '@mui/material';
import { DOMINIOS_PREFERIDOS, NOMBRES_FUENTES } from '../config/fuentes';

const ClearIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.3-6.3z" />
  </SvgIcon>
);

const SelectorFuente = ({ value, onChange, onClear }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: { xs: '100%', md: '280px' },
        maxWidth: 280,
        p: 0.55,
        borderRadius: 999,
        bgcolor: 'rgba(255, 255, 255, 0.72)',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Autocomplete
        size="small"
        options={DOMINIOS_PREFERIDOS}
        value={value || null}
        onChange={(_, newValue) => onChange(newValue)}
        disableClearable
        getOptionLabel={(option) => NOMBRES_FUENTES[option] || option}
        fullWidth
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Todas las fuentes"
            label="Fuente"
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
          />
        )}
      />

      <IconButton aria-label="Limpiar fuente" size="small" onClick={onClear} sx={{ bgcolor: 'rgba(19, 59, 92, 0.08)' }}>
        <ClearIcon />
      </IconButton>
    </Box>
  );
};

export default SelectorFuente;
