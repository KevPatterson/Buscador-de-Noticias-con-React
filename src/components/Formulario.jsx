/* eslint-disable react/prop-types */
import {
    Box,
    Chip,
    IconButton,
    InputAdornment,
    Stack,
    SvgIcon,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { NOMBRES_FUENTES } from '../config/fuentes';
import SelectorFuente from './SelectorFuente';

const AccessTimeIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1zm1 11.41 3.29 3.3-1.42 1.41L11 13V6h2z" />
    </SvgIcon>
);

const ClearIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.3-6.3z" />
    </SvgIcon>
);

const GridViewIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z" />
    </SvgIcon>
);

const ViewListIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M4 5h3v3H4zm0 5h3v3H4zm0 5h3v3H4zM9 5h11v3H9zm0 5h11v3H9zm0 5h11v3H9z" />
    </SvgIcon>
);

const LanguageIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.93 6h-3.14a15.27 15.27 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04A13.27 13.27 0 0 1 13.75 8h-3.5A13.27 13.27 0 0 1 12 4.04zM4.26 14A8.07 8.07 0 0 1 4 12c0-.68.09-1.35.26-2h3.52a16.65 16.65 0 0 0 0 4zm.81 2h3.14a15.27 15.27 0 0 0 1.38 3.56A8.03 8.03 0 0 1 5.07 16zM8.21 8H5.07a8.03 8.03 0 0 1 4.52-3.56A15.27 15.27 0 0 0 8.21 8zM12 19.96A13.27 13.27 0 0 1 10.25 16h3.5A13.27 13.27 0 0 1 12 19.96zM14.22 14H9.78a14.55 14.55 0 0 1 0-4h4.44a14.55 14.55 0 0 1 0 4zM14.41 19.56A15.27 15.27 0 0 0 15.79 16h3.14a8.03 8.03 0 0 1-4.52 3.56zM16.22 14a16.65 16.65 0 0 0 0-4h3.52c.17.65.26 1.32.26 2s-.09 1.35-.26 2z" />
    </SvgIcon>
);

const Formulario = ({
    query,
    onChangeQuery,
    onClearQuery,
    busquedasRapidas,
    chipActivo,
    onQuickSearch,
    categorias,
    categoria,
    onChangeCategoria,
    historial,
    onSelectHistorial,
    onClearHistorial,
    vista,
    onChangeVista,
    fuenteEspecifica,
    onChangeFuenteEspecifica,
    onClearFuenteEspecifica,
}) => {
    return (
        <Box sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    value={query}
                    onChange={(event) => onChangeQuery(event.target.value)}
                    placeholder="Buscar noticias... ej: apagones Cuba, IA, salud"
                    variant="outlined"
                    InputProps={{
                        endAdornment: query ? (
                            <InputAdornment position="end">
                                <IconButton aria-label="Limpiar busqueda" onClick={onClearQuery} edge="end">
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                />

                <Stack direction="row" spacing={1}>
                    <Tooltip title="Vista en grid">
                        <IconButton color={vista === 'grid' ? 'secondary' : 'default'} onClick={() => onChangeVista('grid')}>
                            <GridViewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Vista en lista">
                        <IconButton color={vista === 'list' ? 'secondary' : 'default'} onClick={() => onChangeVista('list')}>
                            <ViewListIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {fuenteEspecifica && (
                <Box sx={{ mb: 2 }}>
                    <Chip
                        icon={<LanguageIcon />}
                        label={NOMBRES_FUENTES[fuenteEspecifica] || fuenteEspecifica}
                        color="secondary"
                        onDelete={onClearFuenteEspecifica}
                    />
                </Box>
            )}

            <Box sx={{ overflowX: 'auto', pb: 1 }}>
                <Stack direction="row" spacing={1} sx={{ width: 'max-content' }}>
                    {busquedasRapidas.map((item) => (
                        <Chip
                            key={item.value}
                            label={item.label}
                            color={chipActivo === item.value ? 'secondary' : 'default'}
                            variant={chipActivo === item.value ? 'filled' : 'outlined'}
                            onClick={() => onQuickSearch(item.value)}
                        />
                    ))}
                </Stack>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={2} sx={{ mt: 2 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Tabs
                        value={categoria}
                        onChange={onChangeCategoria}
                        variant="scrollable"
                        allowScrollButtonsMobile
                        scrollButtons
                    >
                        {categorias.map((item) => (
                            <Tab key={item.value} value={item.value} label={item.label} />
                        ))}
                    </Tabs>
                </Box>

                <SelectorFuente
                    value={fuenteEspecifica}
                    onChange={onChangeFuenteEspecifica}
                    onClear={onClearFuenteEspecifica}
                />
            </Stack>

            <Box sx={{ mt: 2, overflowX: 'auto', pb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: 'max-content' }}>
                    {historial.map((item) => (
                        <Chip
                            size="small"
                            key={item}
                            icon={<AccessTimeIcon />}
                            label={item}
                            onClick={() => onSelectHistorial(item)}
                            variant="outlined"
                        />
                    ))}

                    {historial.length > 0 && (
                        <Chip size="small" color="error" label="Limpiar historial" onClick={onClearHistorial} />
                    )}

                    {historial.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            Aun no tienes busquedas recientes.
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Box>
    );
};

export default Formulario;
