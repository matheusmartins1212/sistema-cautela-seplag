// Tipos das importações de imagem (`import brasao from "...png"`). O Next gera
// isso em next-env.d.ts, que não vai para o repositório; sem esta referência, a
// checagem de tipos falha em ambientes limpos, como o GitHub Actions.
/// <reference types="next/image-types/global" />
