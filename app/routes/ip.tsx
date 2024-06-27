import { useLoaderData } from '@remix-run/react';

export async function loader({ params, request }) {
  return { ip: JSON.stringify([...request.headers.entries()], null, 2) };
}

export default function IP() {
  const { ip } = useLoaderData();
  return <div>IP: {ip}</div>;
}
