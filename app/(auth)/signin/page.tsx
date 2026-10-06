import React from "react";
import Signin from "@/components/supaauth/signin";
const page = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) => {
  const { error } = await searchParams;
  return (
    <div className="flex justify-center items-center h-[calc(100vh-6rem)]">
      <Signin error={error} />
    </div>
  );
};
export default page;
