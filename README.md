# viewFMX

viewFMX is an at-a-glance calendar view web app that makes use of the goFMX API for event data.

## Features

- Displays current and upcoming events
- Settings for building and resource selection
- Inspirational meeting quotes
- Responsive design for various display sizes

## Prerequisites

- Node.js (v16 or higher)
- npm
- FMX API access

## Installation

1. Clone the repository:
```bash
git clone https://github.com/joshua-wise/viewFMX.git
cd viewFMX
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env`
```bash
cp .env.example .env
```

4. Configure the following environment variables in your `.env` file:
```
GOFMX_TOKEN=your_token
NGINX_PROXY_PASS=https://your-domain.gofmx.com/api/v1/
NGINX_PROXY_HOST=your-domain.gofmx.com
VITE_GOFMX_STATUS=FinalizedUpcoming
```

## Development

To run the development server:

```bash
npm run dev
```

## Building for Production via NPM or Docker

```bash
npm run build
```

```bash
docker compose -f docker/docker-compose.yml --env-file .env build
docker compose -f docker/docker-compose.yml --env-file .env up -d
```

## Access & Use

Visit your-ip:3000 in a web browser | select building and resource

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Notice

This connector is not an official FMX product and is developed independently. I am not affiliated with or employed by FMX. It is provided "as-is" with no warranty or guarantee of functionality.