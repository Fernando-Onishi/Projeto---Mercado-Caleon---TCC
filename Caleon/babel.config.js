// Configuração do Babel (compilador do JavaScript do app).
// Igual à padrão do Expo, mais uma otimização só na versão final (APK):
// tira console.log / console.warn / console.info, que gastam processamento à toa no celular.
// console.error continua, para ajudar a diagnosticar problemas.
module.exports = function babelConfig(api) {
	api.cache(true);
	return {
		presets: [require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] })],
		env: {
			production: {
				plugins: [['transform-remove-console', { exclude: ['error'] }]],
			},
		},
	};
};
