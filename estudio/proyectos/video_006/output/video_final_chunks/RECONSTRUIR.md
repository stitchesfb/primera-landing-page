# Reconstruir video_final.mp4

`video_final.mp4` (252 MB) supera el límite de 100 MB por archivo de
GitHub, así que se persiste aquí partido en 3 fragmentos.

## Reconstrucción

```bash
cd estudio/proyectos/video_006/output/video_final_chunks
cat video_final.mp4.part00 video_final.mp4.part01 video_final.mp4.part02 > video_final.mp4
sha256sum -c video_final.mp4.sha256
```

El hash esperado está en `video_final.mp4.sha256`. Si coincide, la
reconstrucción es exacta, byte a byte.
