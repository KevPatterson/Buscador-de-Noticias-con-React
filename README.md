# 📚 Proyecto de Noticias con React

Este proyecto es una aplicación web desarrollada con React que permite a los usuarios seleccionar diferentes categorías de noticias y ver el contenido relacionado. Utiliza la API de noticias y la biblioteca Material-UI para los componentes de la interfaz de usuario.

## ✨ Características

- **🔍 Selección de categorías**: Los usuarios pueden seleccionar diferentes categorías de noticias (general, negocios, entretenimiento, salud, ciencia, deportes, tecnología).
- **📰 Listado de noticias**: Muestra una lista de noticias basada en la categoría seleccionada.
- **⏳ Spinner de carga**: Incluye un spinner animado para indicar cuando las noticias están cargando.
- **💎 Estilo moderno**: Utiliza Material-UI para una interfaz de usuario moderna y atractiva.

## 🛠️ Tecnologías Utilizadas

- **⚛️ React**: Biblioteca para construir interfaces de usuario.
- **🎨 Material-UI**: Framework de componentes de React para un diseño moderno.
- **💅 CSS personalizado**: Estilos personalizados para el spinner de carga y otras partes de la aplicación.
- **🌐 API de Noticias**: Para obtener datos de noticias en tiempo real.

## 🚀 Instalación

Sigue estos pasos para clonar y ejecutar el proyecto en tu entorno local:

1. Clona el repositorio:

    ```bash
    git clone https://github.com/tu-usuario/nombre-del-proyecto.git
    ```

2. Navega al directorio del proyecto:

    ```bash
    cd nombre-del-proyecto
    ```

3. Instala las dependencias:

    ```bash
    npm install
    ```

4. Ejecuta la aplicación en modo de desarrollo:

    ```bash
    npm start
    ```

5. Abre [http://localhost:3000](http://localhost:3000) para ver la aplicación en el navegador.

## 📷 Capturas de Pantalla

### 🏠 Página de Inicio
![Página de Inicio](https://via.placeholder.com/800x400?text=Captura+de+Inicio)

### 🔍 Selección de Categoría
![Selección de Categoría](https://via.placeholder.com/800x400?text=Captura+de+Selección+de+Categoría)

### 📰 Listado de Noticias
![Listado de Noticias](https://via.placeholder.com/800x400?text=Captura+de+Listado+de+Noticias)

### ⏳ Spinner de Carga
![Spinner de Carga](https://via.placeholder.com/800x400?text=Captura+de+Spinner+de+Carga)

## 💡 Uso

1. Selecciona una categoría de noticias desde el menú desplegable.
2. Las noticias correspondientes a la categoría seleccionada se cargarán y se mostrarán en la pantalla.
3. Si las noticias están cargando, un spinner animado se mostrará en el centro de la pantalla.

## 🎨 Personalización

### Cambiar categorías

Puedes personalizar las categorías de noticias modificando el array `CATEGORIAS` en `Formulario.jsx`:

```javascript
const CATEGORIAS = [
    { value: 'general', label: 'General'},
    { value: 'business', label: 'Negocios'},
    // Agrega o elimina categorías según sea necesario
];
```

### Estilización

Puedes ajustar el estilo del spinner o cualquier otro componente modificando los archivos CSS correspondientes en la carpeta `src/styles`.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, sigue los siguientes pasos:

1. Haz un fork del proyecto.
2. Crea una rama para tu función o corrección de errores (`git checkout -b nombre-de-la-rama`).
3. Realiza tus cambios y haz commit (`git commit -m 'Añadir nueva función'`).
4. Envía tus cambios al repositorio remoto (`git push origin nombre-de-la-rama`).
5. Abre un Pull Request.

## 📜 Licencia

Este proyecto está licenciado bajo la [MIT License](LICENSE).

## 📬 Contacto

Para más información o preguntas, puedes contactarme en [tu-email@example.com].
```

Este `README.md` ahora incluye una sección de capturas de pantalla con enlaces de ejemplo y utiliza emojis para mejorar la presentación. Recuerda reemplazar los enlaces de las capturas con imágenes reales de tu aplicación.
