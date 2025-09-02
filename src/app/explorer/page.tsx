import type { Metadata } from "next";
import ExplorerClient from "@/components/explorer/ChurchExplorerClient";

export const metadata: Metadata = {
  title: "Church Explorer - Global.Church",
  description:
    "Explore the Global.Church database with our interactive Church Explorer. A live demonstration of our API.",
};

export default async function ExplorerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 font-display">Church Explorer</h1>
        <p className="mt-2 text-xl text-gray-700">An interactive demonstration of the Global.Church API.</p>
      </div>
      <ExplorerClient />
    </div>
  );
}


