import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code manquant" }, { status: 400 });
  }

  try {
    const res = await fetch(`${process.env.EXTERNAL_API_BASE}/product-serialize/${code}`);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erreur API externe" },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Impossible de contacter l'API" },
      { status: 500 }
    );
  }
}