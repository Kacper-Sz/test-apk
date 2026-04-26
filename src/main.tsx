import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Containers from './views/Containers.tsx'
import Products from './views/Products.tsx'
import Login from './views/Login.tsx'
import Register from './views/Register.tsx'
import Profile from './views/Profile.tsx'
import EditProfile from './views/EditProfile.tsx'
import AddProduct from './views/AddProduct.tsx'
import AddContainer from './views/AddContainer.tsx'
import ProductBarcodeScanner from './views/ProductBarcodeScanner.tsx'
import EditContainer from './views/EditContainer.tsx'
import EditProduct from './views/EditProduct.tsx'

// Dodaj tę stałą - automtycznie wykrywa czy jesteśmy na GitHub Pages
const basename = import.meta.env.PROD ? '/test-apk' : '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>  {/* <--- DODAJ basename TUTAJ */}
      <Routes>
          <Route path="/" element={<App/>} />
          <Route path="/containers" element={<Containers/>} />
          {/* <Route path="/products" element={<Products/>} /> */}
          <Route path="/containers/:id" element={<Products />} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/profile" element={<Profile/>} />
          <Route path="/edit-profile" element={<EditProfile/>} />
          <Route path="/containers/:id/add-product" element={<AddProduct/>} />
          <Route path="/containers/:id/add-product/barcode" element={<ProductBarcodeScanner/>} />
          <Route path="/add-container" element={<AddContainer/>} />
          <Route path="/containers/:id/edit-container" element={<EditContainer/>} />
          <Route path="/containers/:id/edit-product/:productId" element={<EditProduct/>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)