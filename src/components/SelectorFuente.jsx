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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', md: '280px' }, maxWidth: 280 }}>
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
          />
        )}
      />

      <IconButton aria-label="Limpiar fuente" size="small" onClick={onClear}>
        <ClearIcon />
      </IconButton>
    </Box>
  );
};

export default SelectorFuente;
