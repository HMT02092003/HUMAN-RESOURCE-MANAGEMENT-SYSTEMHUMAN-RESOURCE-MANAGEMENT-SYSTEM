import React from "react";
import { Layout, Row, Col, Typography, Button, Space, Card } from "antd";
import { FacebookOutlined, YoutubeOutlined, TikTokOutlined } from "@ant-design/icons";
import "./footer.css"; // Import file CSS
import { useRouter } from "next/navigation"


const { Title, Text, Link } = Typography;

const App: React.FC = () => {
  const router = useRouter()

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24} style={{ marginBottom: "16px" }}>
          <Title level={4} style={{ textAlign: "left", fontSize: "15px" }}>
            Hệ thống cửa hàng
          </Title>
        </Col>
        <Col span={24} style={{ marginBottom: "16px" }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card className="cardStyle">
                <Text className="textStyle">
                  <strong>Thành phố Hồ Chí Minh</strong>
                  <br />
                  Số 5 - 7 Nguyễn Huy Tưởng, F6, Q. Bình Thạnh
                  <br />
                  <Text type="danger">Đã đóng cửa, hẹn bạn 09:00</Text>
                  <br />
                  09:00 - 21:00
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="cardStyle">
                <Text className="textStyle">
                  <strong>Thành phố Hồ Chí Minh</strong>
                  <br />
                  95 Trần Thiện Chánh, Q10
                  <br />
                  <Text type="danger">Đã đóng cửa, hẹn bạn 09:00</Text>
                  <br />
                  09:00 - 21:00
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="cardStyle">
                <Text className="textStyle">
                  <strong>Hà Nội</strong>
                  <br />
                  53 Thái Hà, Đống Đa
                  <br />
                  <Text type="success">Mở cửa</Text>
                  <br />
                  09:00 - 22:00
                </Text>
              </Card>
            </Col>
          </Row>
        </Col>

        <Col span={6} className="colContainer" style={{ paddingLeft: "2%" }}>
          <Title level={5} className="titleStyle">
            Đa dạng thanh toán
          </Title>
          <div>
            <div>
              <img src="/icon/transfer.png" className="icon" /> Chuyển khoản
            </div>
            <div>
              <img src="/icon/dollar.png" className="icon" /> Tiền mặt
            </div>
            <div>
              <img src="/icon/transfer.png" className="icon" /> ZaloPay
            </div>
            <div>
              <img src="/icon/transfer.png" className="icon" /> MoMo
            </div>
            <div>
              <img src="/icon/atm-card.png" className="icon" /> Thẻ ATM
            </div>
            <div>
              <img src="/icon/globe.png" className="icon" /> Thẻ Quốc tế
            </div>
          </div>
        </Col>
        <Col span={6} className="colContainer">
          <Title level={5} className="titleStyle">
            Thông tin hữu ích
          </Title>
          <div style={{ cursor: "pointer" }}>
            <div onClick={() => router.push('/warrantypolicy')}>
              <img src="/icon/check.png" className="icon" /> Chính sách bảo hành
            </div>
            <div onClick={() => router.push('/exchangepolicy')}>
              <img src="/icon/transfer.png" className="icon" /> Chính sách đổi trả
            </div>
            <div onClick={() => router.push('/shippingpolicy')}>
              <img src="/icon/trailer-truck.png" className="icon" /> Chính sách vận chuyển
            </div>
            <div onClick={() => router.push('/privacypolicy')}>
              <img src="/icon/lock.png" className="icon" /> Chính sách bảo mật
            </div>
            <div onClick={() => router.push('/policypayment')}>
              <img src="/icon/atm-card.png" className="icon" /> Chính sách thanh toán
            </div>
            <div onClick={() => router.push('/inspectionpolicy')}>
              <img src="/icon/scan.png" className="icon" /> Chính sách kiểm hàng
            </div>
            <div onClick={() => router.push('/guide')}>
              <img src="/icon/shopping-cart.png" className="icon" /> Hướng dẫn mua hàng online
            </div>
            <div onClick={() => router.push('/aboutUs')}>
              <img src="/icon/information.png" className="icon" /> Về chúng tôi
            </div>
          </div>
        </Col>

        <Col span={6} className="colContainer">
          <Title level={5} className="titleStyle">
            Social networks
          </Title>
          <Space direction="vertical">
            <Link href="https://facebook.com" className="textStyle">
              <FacebookOutlined /> Facebook
            </Link>
            <Link href="https://youtube.com" className="textStyle">
              <YoutubeOutlined /> Youtube
            </Link>
            <Link href="https://tiktok.com" className="textStyle">
              <TikTokOutlined /> Tiktok
            </Link>
            <Link href="https://telegram.org" className="textStyle">
              <img src="/icon/telegram.png" className="socialIcon" /> Telegram
            </Link>
          </Space>
        </Col>

        <Col span={6} className="colContainer" style={{ paddingRight: "2%" }}>
          <Title level={5} className="titleStyle">
            Phản hồi, góp ý, khiếu nại
          </Title>
          <Text className="textStyle">
            Phản hồi nóng về chất lượng sản phẩm và dịch vụ. Đội ngũ Kiểm Soát
            Chất Lượng của chúng tôi sẵn sàng lắng nghe quý khách.
          </Text>
          <br />
          <Button type="primary" className="primaryButton">
            Gửi phản hồi ngay
          </Button>
        </Col>
        {/* Footer */}
        <div className="footerContent" style={{ textAlign: "center", width: "100%" }}>
          <Text>© ThinkPro 2024 - CREATE BY NHÓM 11 </Text>
        </div>
      </Row>
    </>
  );
};

export default App;
