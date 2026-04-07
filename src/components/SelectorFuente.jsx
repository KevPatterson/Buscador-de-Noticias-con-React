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
        maxWidth: { xs: '100%', md: 280 },
        p: 0.4,
        borderRadius: 1,
        bgcolor: 'background.default',
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
        sx={{
          '& .MuiInputLabel-root': {
            color: 'text.secondary',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'primary.main',
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
            bgcolor: 'background.paper',
            color: 'text.primary',
          },
          '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-endAdornment .MuiSvgIcon-root': {
            color: 'text.secondary',
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Todas las fuentes"
            label="Fuente"
            InputLabelProps={{ shrink: true }}
          />
        )}
      />

      <IconButton
        aria-label="Limpiar fuente"
        size="small"
        onClick={onClear}
        sx={{
          bgcolor: 'rgba(46, 42, 36, 0.9)',
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          '&:hover': {
            bgcolor: 'rgba(232, 200, 74, 0.1)',
            color: 'primary.main',
          },
        }}
      >
        <ClearIcon />
      </IconButton>
    </Box>
  );
};

export default SelectorFuente;
