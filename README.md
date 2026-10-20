Para configuración del front en angular.
Clonar este repositorio en alguna carpeta correspondiente, despues ubicarse en ella y ejecutar el siguiente comando 'npm install' esto instalara todas las dependencias, versiones y configuraicon
del proyecto en angular.
Después de ello realizar una prueba con 'ng serve' y si aparece que esta en ejecución en el puerto local se configuro correctamente el proyecto.

-----------------------

Para configuracion del backend.
Mismo paso de clonar pero ahora ubicarse en la carpeta del backend 'SistemaInventarioAPI' y ejecutar el siguiente comando 'dotnet restore'.
Después se realiza las migraciones o actualizar la bd en este caso 'dotnet ef database update'.
Y para finalizar realizar una prueba con 'dotnet run' y si aparece el mensaje info en verde y que esta hosteando se realizo correctamente la configuración inicial


------------------------



Por ultimo para un manejo limpio de versiones se dividirá en tres ramas
Rama master/main sera el entorno de produccion, no se toca hasta esta 100% seguro que la apliacion funciona sin bugs.
Rama development sera el entorno donde se trabajara y unira cada feature.
Rama feature/....nombre de la pantalla que se esta trabajando,  ejemplo login, cuando se finalice se hace el commmit y se sube a esa rama, después se cambia a development y se hace el merge para que 
se tenga esos cambios.
