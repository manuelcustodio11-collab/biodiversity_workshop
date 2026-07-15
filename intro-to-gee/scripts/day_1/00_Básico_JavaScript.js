////////////////////////////////////////////////////////////////////////////////
// Taller: Regional Biodiversity Workshop
// Autor: Google
// Objetivo: Aprender lo báscico para iniciar con JavaScript
////////////////////////////////////////////////////////////////////////////////

//Variables
var variable = 1;
print(variable);
 
var string = 'Hello, World!';
print(string);

//Listas
var lista = [1.23, 8, -3];
print(lista[2]);

//Diccionario
var diccionario = {
  a: 'Hola',
  b: 10,
  c: 0.1343,
  d: lista
};
print(diccionario);
print(diccionario.b);
print(variable, string, lista, diccionario);

// Funciones
var funcionHola = function(nombre){
  return 'Hola ' + nombre;
};

function funcionHola2(nombre){
  return 'Hola ' + nombre + ', mucho gusto en conocerte.';
}
print(funcionHola('Ramón'));
print(funcionHola2('Rosaura'));


// Lado del Servidor vs lado del Cliente
var stringServidor = ee.String('Voy a lugares...');
var stringCliente = 'Me quedo aquí';

print(stringServidor);
print(stringCliente);

