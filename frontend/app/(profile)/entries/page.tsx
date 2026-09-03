import Entries from "@/components/Entries";

export default async function EntriesPage() {
    return (
        <div className={"flex flex-col px-3"}>
            <h1 className="place-self-center p-4 mb-4 text-5xl font-bold font-flower">Your Reflections</h1>
            <Entries />
        </div>
    )
}
