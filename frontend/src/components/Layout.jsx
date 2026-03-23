import { Outlet } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";
import LoadingSpinner from "./LoadingSpinner";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Layout = () => {
	const { loading } = useLoading()
  return (
    <div className="w-full min-h-screen bg-gray-950 text-white">
      {loading && <LoadingSpinner />}
      {/* Centered content container */}
      <div>
        <Outlet />
      </div>
      <ToastContainer
        position="bottom-left"
        autoClose={1800}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default Layout;