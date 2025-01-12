import axios from 'axios';
import { useState, useEffect, createContext } from 'react';

const NoticiasContext = createContext();

const NoticiasProvider = ({ children }) => {
    const [categoria, setCategoria] = useState('general');
    const [noticias, setNoticias] = useState([]);
    const [pagina, setPagina] = useState(1);
    const [totalNoticias, setTotalNoticias] = useState(0);
    const [loading, setLoading] = useState(false); // Estado de carga

    useEffect(() => {
        const consultarAPI = async () => {
            setLoading(true); // Inicia el spinner
            const apiKey = import.meta.env.VITE_API_KEY;
            const url = `https://newsapi.org/v2/top-headlines?country=us&category=${categoria}&apiKey=${apiKey}`;
            try {
                const { data } = await axios(url);
                console.log("Datos recibidos:", data); // Verifica la respuesta
                setNoticias(data.articles);
                setTotalNoticias(data.totalResults);
            } catch (error) {
                console.error("Error al consultar la API:", error);
            } finally {
                setLoading(false); // Detiene el spinner
            }
        };
        consultarAPI();
    }, [categoria]);

    useEffect(() => {
        const consultarAPI = async () => {
            setLoading(true); // Inicia el spinner
            const apiKey = import.meta.env.VITE_API_KEY;
            const url = `https://newsapi.org/v2/top-headlines?country=us&page=${pagina}&category=${categoria}&apiKey=${apiKey}`;
            try {
                const { data } = await axios(url);
                console.log("Datos recibidos:", data); // Verifica la respuesta
                setNoticias(data.articles);
                setTotalNoticias(data.totalResults);
            } catch (error) {
                console.error("Error al consultar la API:", error);
            } finally {
                setLoading(false); // Detiene el spinner
            }
        };
        consultarAPI();
    }, [pagina]);

    const handleChangeCategoria = (e) => {
        setCategoria(e.target.value);
        setPagina(1);
    };

    const handleChangePagina = (e, valor) => {
        setPagina(valor);
    };

    return (
        <NoticiasContext.Provider
            value={{
                categoria,
                handleChangeCategoria,
                noticias,
                totalNoticias,
                handleChangePagina,
                pagina,
                loading, // Proveer el estado de loading
            }}
        >
            {children}
        </NoticiasContext.Provider>
    );
};

export { NoticiasProvider };
export default NoticiasContext;
