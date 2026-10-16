import IncomeAffidavitTool from "../../dashboard/tools/IncomeAffidavitTool";

export const metadata = {
  title: "Income Affidavit Application | Akshaya Center",
  description: "Submit your Income Affidavit application to the Akshaya centre.",
};

export default function IncomeAffidavitCustomerPage() {
  return <IncomeAffidavitTool publicMode />;
}
