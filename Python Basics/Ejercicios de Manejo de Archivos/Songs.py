# Abrir archivo en modo lectura
file = open("songs.txt", "r")

# Leer todas las líneas
songs = file.readlines()

# Cerrar archivo
file.close()

# Eliminar saltos de línea
for i in range(len(songs)):
    songs[i] = songs[i].strip()

# Ordenar lista alfabéticamente
songs.sort()

# Abrir nuevo archivo en modo escritura
new_file = open("sorted_songs.txt", "w")

# Guardar canciones ordenadas
for i in range(len(songs)):
    new_file.write(songs[i] + "\n")

# Cerrar archivo
new_file.close()

print("Songs sorted successfully")