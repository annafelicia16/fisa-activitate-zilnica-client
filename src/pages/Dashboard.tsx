import { Header } from "@/components/layout/Header"
import { Container } from "@/components/layout/Container"
import { PersonalInfoCard } from "@/components/dashboard/PersonalInfoCard"
import { ActivitySheetCard } from "@/components/dashboard/ActivitySheetCard"
import { PreviousSheetsCard } from "@/components/dashboard/PreviousSheetsCard"
import { SupplementaryCard } from "@/components/dashboard/SupplementaryCard"

export function Dashboard() {
    return (
        <div className="min-h-screen bg-[#f8f9fc] py-10">
            <Container>
                <Header />
                <div className="flex flex-col gap-6">
                    <PersonalInfoCard />
                    <ActivitySheetCard />
                    <PreviousSheetsCard />
                    <SupplementaryCard />
                </div>
            </Container>
        </div>
    )
}

