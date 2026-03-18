import { Grid } from "react-loader-spinner";

const LoadingSpinner = () => {
  return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
    <Grid
      visible={true}
      height="50"
      width="50"
      color="#fff"
      ariaLabel="grid-loading"
      radius="12.5"
      wrapperStyle={{}}
      wrapperClass="grid-wrapper"
    />
		</div>
  );
};

export default LoadingSpinner;
