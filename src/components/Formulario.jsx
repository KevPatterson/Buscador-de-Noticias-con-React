import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useCallback } from 'react'; // Asegúrate de importar useCallback
import useNoticias from '../hooks/useNoticias';

const CATEGORIAS = [
    { value: 'general', label: 'General' },
    { value: 'business', label: 'Negocios' },
    { value: 'entertainment', label: 'Entretenimiento' },
    { value: 'health', label: 'Salud' },
    { value: 'science', label: 'Ciencia' },
    { value: 'sports', label: 'Deportes' },
    { value: 'technology', label: 'Tecnología' },
];

const Formulario = () => {
    const { categoria, handleChangeCategoria } = useNoticias();

    // Mover el useCallback dentro del componente
    const onChangeCategoria = useCallback(
        (e) => {
            handleChangeCategoria(e);
        },
        [handleChangeCategoria]
    );

    return (
        <form action="">
            <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                    label="Categoría"
                    onChange={onChangeCategoria}
                    value={categoria}
                >
                    {CATEGORIAS.map((categoria) => (
                        <MenuItem key={categoria.value} value={categoria.value}>
                            {categoria.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </form>
    );
};

export default Formulario;
