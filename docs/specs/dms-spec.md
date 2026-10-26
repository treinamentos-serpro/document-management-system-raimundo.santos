# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória nesta primeira versão.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos pertencentes ao usuário solicitante.
- Download de um documento pelo identificador, respeitando a propriedade.
- Associação de cada documento a um identificador de usuário.
- Armazenamento dos arquivos em `backend/storage`, usando `multer` com `diskStorage`.
- Persistência dos metadados em memória durante a execução do processo.
- Interface React para upload, listagem e download, consumindo a API via prefixo `/api` do proxy do Vite.
- Endpoint de saúde do backend (`GET /health`).

### Fora do escopo

- Armazenamento em nuvem, banco de dados ou qualquer serviço externo.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Cadastro, login, recuperação de senha e implementação de um provedor de autenticação.
- Upload de múltiplos arquivos em uma única requisição.
- Recuperação automática dos metadados após reinício do backend.
- Garantia de disponibilidade ou durabilidade dos arquivos além do filesystem local.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um único arquivo pela operação de upload. |
| RF-02 | O upload exige um arquivo no campo multipart `file` e uma identidade de usuário válida no contexto da requisição. |
| RF-03 | O sistema gera um identificador único e um nome físico seguro para o arquivo; o nome original é mantido apenas como metadado. |
| RF-04 | O sistema registra para cada documento o identificador, nome original, tamanho em bytes, data/hora de upload e dono. |
| RF-05 | O usuário pode listar somente os documentos associados à sua identidade. A lista é ordenada do mais recente para o mais antigo; empates são ordenados pelo identificador. |
| RF-06 | O usuário pode baixar um documento pelo identificador somente se ele pertencer ao usuário solicitante. Um documento inexistente ou pertencente a outro usuário retorna a mesma resposta de não encontrado. |
| RF-07 | O sistema informa erros de entrada e de processamento em JSON, com código HTTP apropriado e mensagem estável para o cliente. |
| RF-08 | O endpoint de saúde responde indicando que o processo está ativo. Ele não deve expor dados de documentos nem detalhes internos. |
| RF-09 | O frontend permite selecionar e enviar um arquivo, visualizar a lista do usuário e iniciar o download de um item. Erros da API são apresentados ao usuário sem apagar a lista atual. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local da aplicação por meio de `multer` e `diskStorage`; nenhum provedor externo pode ser usado. |
| RNF-02 | Os metadados devem ser mantidos em memória e isolados atrás do repositório. Reiniciar o processo remove os metadados, embora os arquivos possam continuar no disco. |
| RNF-03 | Configurações operacionais devem vir de variáveis de ambiente, com valores padrão documentados para desenvolvimento local. |
| RNF-04 | O caminho físico do arquivo deve ser gerado pela aplicação. Nome e caminho enviados pelo cliente nunca podem determinar o destino no disco. |
| RNF-05 | A API deve limitar o tamanho do upload por configuração; o valor padrão é 10 MiB (`10 * 1024 * 1024` bytes). Não há allowlist de extensões ou tipos MIME nesta versão. |
| RNF-06 | Erros internos não devem revelar stack traces, caminhos locais ou conteúdo de arquivos nas respostas HTTP. |
| RNF-07 | O código do backend deve manter a separação simples `routes -> controllers -> services -> repositories`; camadas internas não dependem de Express. |
| RNF-08 | O frontend deve seguir a organização existente por componentes, páginas e serviços e usar `fetch` para chamadas HTTP. |
| RNF-09 | O backend deve ser testável com o runner nativo `node:test`; os testes de integração devem usar armazenamento temporário e removê-lo ao final. |

### Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local usado pelo `diskStorage`. Caminho relativo deve ser resolvido de forma previsível a partir da raiz do backend. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Limite máximo de bytes por arquivo. Valores inválidos ou não positivos devem impedir a inicialização ou ser rejeitados com erro claro de configuração. |

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único, opaco e gerado pelo servidor. |
| `originalName` | string | Sim | Nome informado pelo cliente, preservado para exibição e download; não é usado como caminho no disco. |
| `size` | number | Sim | Tamanho do conteúdo em bytes, informado pelo middleware após receber o arquivo. |
| `uploadedAt` | string | Sim | Data/hora UTC em formato ISO 8601. |
| `owner` | string | Sim | Identificador do usuário associado ao documento. |

Exemplo de representação pública:

```json
{
  "id": "a1f7c1d2-3e4b-4c5d-8f90-123456789abc",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-26T15:30:00.000Z",
  "owner": "user-123"
}
```

### Dados internos de armazenamento

O repositório pode manter um nome físico gerado pelo servidor ou caminho interno para localizar o arquivo. Esse dado não faz parte da resposta da API. O repositório de metadados mantém os registros em memória, indexados por `id`; não há persistência de metadados em banco de dados.

### Identidade e propriedade

Os casos de uso recebem o identificador do usuário a partir de um contexto de identidade confiável, disponibilizado pelo limite HTTP. O mecanismo de autenticação não faz parte desta especificação. Em ambiente local de desenvolvimento, pode-se usar `X-User-Id` como mecanismo provisório; esse valor não autentica ninguém e não pode ser tratado como confiável em uma implantação acessível a terceiros. Em implantação protegida, o identificador deve vir de uma sessão ou middleware de autenticação já validado. O cliente não pode escolher o dono no corpo do upload.

## 6. Contratos de API

As rotas abaixo são expostas pelo backend sem prefixo. No frontend, o proxy do Vite encaminha `/api` para o backend; assim, por exemplo, `POST /api/upload` no navegador corresponde a `POST /upload` no backend.

### Formato padrão de erro

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo 'file'."
  }
}
```

O campo `code` é estável para tratamento pelo cliente. `message` é legível e não contém detalhes internos. Respostas de sucesso não incluem o objeto `error`.

### `POST /upload`

- **Entrada:** `multipart/form-data`, campo único `file` com o conteúdo binário.
- **Identidade:** usuário obtido do contexto confiável da requisição; nenhum campo `owner` é aceito do cliente.
- **Sucesso:** `201 Created`, `Content-Type: application/json`.

```json
{
  "document": {
    "id": "a1f7c1d2-3e4b-4c5d-8f90-123456789abc",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-10-26T15:30:00.000Z",
    "owner": "user-123"
  }
}
```

- **Erros:** `400 FILE_REQUIRED` quando o campo não é enviado; `400 INVALID_FILE` quando a requisição multipart é inválida ou não contém um arquivo válido; `401 USER_IDENTITY_REQUIRED` quando não há identidade no contexto; `413 FILE_TOO_LARGE` quando excede `MAX_FILE_SIZE_BYTES`; `500 INTERNAL_ERROR` para falha inesperada.
- Se a gravação falhar, nenhum metadado deve ser registrado. Se o registro do metadado falhar depois da gravação, o arquivo recém-criado deve ser removido quando possível.

### `GET /documents`

- **Entrada:** sem corpo. Exige identidade de usuário no contexto.
- **Sucesso:** `200 OK`, `Content-Type: application/json`; retorna documentos do usuário em ordem decrescente de `uploadedAt`.

```json
{
  "documents": [
    {
      "id": "a1f7c1d2-3e4b-4c5d-8f90-123456789abc",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-10-26T15:30:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

- Uma lista vazia é representada por `{"documents": []}`.
- **Erros:** `401 USER_IDENTITY_REQUIRED`; `500 INTERNAL_ERROR` para falha inesperada.

### `GET /documents/:id/download`

- **Entrada:** `id` no caminho; exige identidade de usuário no contexto.
- **Sucesso:** `200 OK`, conteúdo binário do arquivo, `Content-Type` detectado ou `application/octet-stream` como fallback e `Content-Disposition: attachment` com o nome original sanitizado.
- **Erros:** `401 USER_IDENTITY_REQUIRED`; `404 DOCUMENT_NOT_FOUND` se o documento não existir, não pertencer ao usuário ou se o arquivo não estiver disponível no disco; `500 INTERNAL_ERROR` para falhas inesperadas de leitura.
- O nome original deve ser tratado como valor de cabeçalho não confiável e sanitizado para impedir injeção de cabeçalhos. O caminho usado para leitura vem exclusivamente do repositório, nunca do parâmetro `id` concatenado diretamente com um caminho.

### `GET /health`

- **Sucesso:** `200 OK`, `Content-Type: application/json`.

```json
{ "status": "ok" }
```

## 7. Decisões arquiteturais

- **Routes:** declaram os caminhos HTTP e encaminham a requisição ao controller correspondente.
- **Controllers:** extraem arquivo, parâmetros e identidade do contexto HTTP; validam o formato de entrada e traduzem resultados/erros para status e JSON. Não contêm regras de negócio ou acesso direto ao filesystem.
- **Services:** aplicam as regras de upload, propriedade, listagem e download; coordenam repositórios sem depender do Express.
- **Repositories:** fornecem operações de arquivos locais e metadados em memória. O armazenamento de arquivos usa `multer` com `diskStorage`, nome físico gerado pelo servidor e diretório configurável.
- **Frontend:** componentes React organizados nas pastas existentes; páginas coordenam a experiência e serviços encapsulam chamadas `fetch` ao prefixo `/api`.
- **Falhas e consistência:** o upload só publica metadados após a gravação do arquivo. Falhas posteriores tentam remover o arquivo órfão. O download não revela se um documento de outro usuário existe.
- **Reinício:** os arquivos permanecem no diretório local, mas os registros em memória são perdidos. Não há mecanismo de reconstrução, limpeza ou recuperação automática nesta fase.
- **Limite de segurança:** a propriedade reduz o acesso entre usuários apenas quando a identidade fornecida à aplicação é confiável. Um cabeçalho livre `X-User-Id` é somente um recurso de desenvolvimento, não uma autenticação.

## 8. Critérios de aceite

- Upload válido retorna `201`, metadados completos e grava o conteúdo em `STORAGE_DIR` com nome físico gerado pelo servidor.
- Upload sem arquivo, multipart inválido e arquivo acima do limite retornam os códigos de erro documentados e não deixam metadados indevidos.
- A listagem retorna somente documentos do usuário e respeita a ordenação definida, inclusive quando não há documentos.
- Download do dono retorna os bytes originais como anexo; documento inexistente ou de outro usuário retorna o mesmo `404`.
- A ausência de identidade retorna `401` nas operações de upload, listagem e download.
- Falhas de filesystem não expõem caminhos internos nem stack traces; o upload tenta remover arquivo criado sem metadado correspondente.
- Frontend consegue enviar, listar e baixar pela API e apresenta falhas sem perder o estado útil da tela.
- Testes automatizados verificam contratos HTTP, isolamento por dono, limite de tamanho e comportamento de falha de filesystem sem usar o diretório de armazenamento real.

## 9. Plano de execução

O plano abaixo descreve etapas de trabalho. Esta especificação não cria nem executa arquivos de backend ou frontend.

1. **Confirmar decisões e limites:** validar identidade de usuário, limite de upload, respostas de erro, diretório local e consequências da perda dos metadados após reinício.
2. **Implementar backend por camadas:** construir repositórios de arquivo local e metadados em memória, serviços de documentos, controllers e rotas conforme os contratos desta especificação.
3. **Cobrir o backend com testes:** testar upload, listagem, download, propriedade, erros, limite de tamanho e falhas usando diretório temporário.
4. **Implementar a experiência frontend:** criar os fluxos de envio, listagem, estados vazios/carregando/erro e download, encapsulando `fetch` nos serviços existentes.
5. **Integrar e validar ponta a ponta:** verificar proxy `/api`, configurar ambiente local, executar testes e validar os critérios de aceite nos fluxos principais.
6. **Revisar documentação e operação:** documentar variáveis de ambiente, limitações de persistência e inicialização; conferir que nenhum armazenamento externo ou autenticação implícita foi introduzido.

## 10. Riscos e premissas

- O armazenamento em memória perde os metadados no reinício; arquivos antigos podem ficar órfãos no disco. Isso é uma limitação aceita da primeira versão, não uma garantia de persistência completa.
- A identidade de usuário não pode ser considerada segura sem autenticação confiável. O mecanismo de autenticação deve ser definido antes de disponibilizar o sistema a usuários não confiáveis.
- Sem uma allowlist de formatos, o sistema aceita tipos de arquivo variados; a interface não deve executar nem renderizar automaticamente conteúdo enviado.
- O limite padrão de 10 MiB é uma decisão inicial de produto e pode ser alterado por `MAX_FILE_SIZE_BYTES` sem mudar o contrato de dados.
- A aplicação depende de permissões de leitura/escrita no diretório local configurado e de espaço disponível no disco.