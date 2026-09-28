import express, { type Request, type Response } from 'express'
import { products } from './mock/products.js'

const app   = express();
const PORT  = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.json({
        message: "Welcome",
    })
})

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'backend-api'
  });
});

app.get('/api/products', (req: Request, res: Response) => {
    res.json({
        products
    })
})

app.get('/api/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const product = products.find((p) => p.id === id);
    if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
});

app.listen(PORT, () => {
    console.log(`Server is running at: http://localhost:${PORT}`)
})