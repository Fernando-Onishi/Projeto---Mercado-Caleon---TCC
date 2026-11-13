import React, { createContext, useCallback, useContext, useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../Config/FireBaseConfig';
import { getUserRole } from '../src/utils/getUserRole';
import ProductFormModal from '../TelasAdmin/ProductFormModal';

const ProductModalContext = createContext(null);

export function ProductModalProvider({ children }) {
	const [modalRequest, setModalRequest] = useState(null);
	const [isCheckingRole, setIsCheckingRole] = useState(false);

	const openProductModal = useCallback(async ({ productId = null, product = null }) => {
		if (isCheckingRole) return;
		setIsCheckingRole(true);
		try {
			const user = auth.currentUser;
			const role = user ? await getUserRole(user) : null;
			if (role !== 'admin') {
				Alert.alert('Acesso restrito', 'Somente administradores podem cadastrar ou editar produtos.');
				return;
			}
			setModalRequest({ productId, product });
		} catch (error) {
			console.error('Não foi possível validar o acesso ao formulário de produto.', error);
			Alert.alert('Erro', 'Não foi possível validar seu acesso. Tente novamente.');
		} finally {
			setIsCheckingRole(false);
		}
	}, [isCheckingRole]);

	const closeProductModal = useCallback(() => setModalRequest(null), []);

	return (
		<ProductModalContext.Provider value={{ openProductModal, closeProductModal, isProductModalOpen: Boolean(modalRequest) }}>
			{children}
			{modalRequest ? (
				<ProductFormModal
					key={modalRequest.productId || 'new-product'}
					visible
					productId={modalRequest.productId}
					product={modalRequest.product}
					onClose={closeProductModal}
				/>
			) : null}
		</ProductModalContext.Provider>
	);
}

export function useProductModal() {
	const context = useContext(ProductModalContext);
	if (!context) throw new Error('useProductModal deve ser usado dentro de ProductModalProvider.');
	return context;
}
