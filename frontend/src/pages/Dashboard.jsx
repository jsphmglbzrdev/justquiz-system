
import LoadingSpinner from '../components/LoadingSpinner'
import Navbar from '../components/Navbar'
import MainPage from '../components/MainPage'
import { useLoading } from '../context/LoadingContext'
const Dashboard = () => {
	
	const { loading } = useLoading()

	return (
		<div>
			
			<Navbar/>
			<MainPage/>

		</div>
	)
}

export default Dashboard