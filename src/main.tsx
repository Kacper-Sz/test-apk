import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import FriendsList from './views/FriendsList.tsx'
import Notifications from './views/Notifications.tsx'
import '/src/styles/bootstrap_overrides.scss';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/containers" element={<Containers/>} />
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
          <Route path="/friends" element={<FriendsList />} />
          <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
