import {
    Box,
    Chip,
    IconButton,
    InputAdornment,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ClearIcon from '@mui/icons-material/Clear';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';

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

            <Tabs
                value={categoria}
                onChange={onChangeCategoria}
                variant="scrollable"
                allowScrollButtonsMobile
                scrollButtons
                sx={{ mt: 2 }}
            >
                {categorias.map((item) => (
                    <Tab key={item.value} value={item.value} label={item.label} />
                ))}
            </Tabs>

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
