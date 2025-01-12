import React from 'react'
import NoticiasContext from '../context/NoticiasProvider'
import { Card, CardActions, CardContent, Link, Typography, Grid } from '@mui/material'

const Noticia = ({noticia}) => {

    const {urlToImage, url, title, description, source} = noticia
    return (
        <Card>
            <CardMedia component="img" height="140" image={urlToImage} alt= {`Imagen de la noticia ${title}`} />
        </Card>
    )
}

export default Noticia