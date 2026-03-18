import { Outlet } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";
import LoadingSpinner from "./LoadingSpinner";

const Layout = () => {
	const { loading } = useLoading()
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {loading && <LoadingSpinner />}
      {/* Centered content container */}
      <div>
        <Outlet />
      </div>

    </div>
  );
};

export default Layout;