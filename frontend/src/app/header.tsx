import React, { use, useEffect, useRef, useState } from 'react';
import { ConfigProvider, Input, Button, Row, Col, Carousel, Popover, Form, message, Dropdown } from 'antd';
import { LeftOutlined, RightOutlined, ArrowRightOutlined, InfoCircleOutlined, LoginOutlined, LogoutOutlined, FormOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { CarouselRef } from 'antd/es/carousel'; // Thêm import CarouselRef
import axios from "axios";
import _, { set } from 'lodash';
import Cookies from 'js-cookie';
import { getDecodedToken } from '../utils/decode-token';
import cookies from 'js-cookie';

const { Search } = Input;

const HeaderPage = () => {
  const router = useRouter();
  const carouselRef = useRef<CarouselRef>(null);  // Khai báo ref đúng kiểu
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [category, setCategory] = useState<any>([])
  const [Brand, setBrand] = useState<any>([])
  const [results, setResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [checkAuth, setCheckAuth] = useState<any>();

  const [form] = Form.useForm();

  //fake data ở đây

  const brands = ['Dell', 'HP', 'Lenovo', 'Apple', 'Acer', 'Asus', 'Asus', 'Asus', 'Asus', 'Asus', 'Asus', 'Asus'];
  const priceRanges = ['10-15 triệu', '15-20 triệu', '20-25 triệu', '25-30 triệu', '30-35 triệu', '35-40 triệu'];
  const needs = ['Sinh viên', 'Văn phòng', 'Gaming', 'Lập trình', 'Đồ họa'];
  const content = (
    <div>
      <p>Địa chỉ: 123 Phố Giả, Phường Ảo, Quận 9, TP. Hồ Chí Minh</p>
    </div>
  );

  const checkAuthHandel = () => {
    const authToken = Cookies.get('token');
    console.log('Token:', authToken);
    if (authToken) {
      console.log('Token:', authToken);
      const tokenAfterDecode = getDecodedToken(authToken);
      console.log('Token after decode:', tokenAfterDecode?.role);
      setCheckAuth(tokenAfterDecode);
    }
  };


  const handleLoginClick = () => {
    router.push('/login');
  };

  const handleRegisterClick = () => {
    router.push('/register');
  };
  const handleButtonClick = () => {
    router.push('/technologyNews');
  };

  const popoverContent = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {checkAuth ? (
          <>
            <Button
              color="primary"
              variant="text"
              onClick={() => router.push('/profile')}
              style={{ width: '100%' }}
            >
              <InfoCircleOutlined />Thông tin cá nhân
            </Button>
            <Button
              color="danger"
              variant="text"
              onClick={() => {
                cookies.remove('token');
                router.push('/login');
              }}
              style={{ width: '100%' }}
            >
              <LogoutOutlined />Đăng xuất
            </Button>
          </>
        ) : (
          <>
            <Button
              color="primary"
              variant="text"
              onClick={handleLoginClick}
              style={{ width: '100%' }}
            >
              <LoginOutlined />Đăng nhập
            </Button>
            <Button
              color="default"
              variant="text"
              onClick={handleRegisterClick}
              style={{ width: '100%' }}
            >
              <FormOutlined />Đăng ký
            </Button>
          </>
        )}
      </div>
    </>
  );

  const handleCategoryClick = (index: number, categoryId: number) => {
    setSelectedCategory(index);
    router.push(`http://localhost:4000/product/category/${categoryId}`);
  }

  // Hàm xử lý khi nhấn nút mũi tên trái
  const handlePrev = () => {
    if (carouselRef.current) {
      carouselRef.current.prev();  // Di chuyển về slide trước
    }
  };

  // Hàm xử lý khi nhấn nút mũi tên phải
  const handleNext = () => {
    if (carouselRef.current) {
      carouselRef.current.next();  // Di chuyển đến slide tiếp theo
    }
  };

  const getAllCategory = async () => {
    try {
      const data = await axios.get('http://localhost:4000/api/allCategory')
      setCategory(data.data)
    } catch (err: any) {
      message.error(err.response.data.message);
    }
  }

  useEffect(() => {
    getAllCategory();
  }, [])

  const getAllBrand = async () => {
    try {
      const data = await axios.get('http://localhost:4000/api/allBrand')
      console.log('count:', data)
      setBrand(data.data)
    } catch (err: any) {
      message.error(err.response.data.message);
    }
  }

  const getSearchData = _.debounce(async () => {
    try {
      const searchTerm = form.getFieldValue('search')
      const data = await axios.get(`http://localhost:4000/api/search?search=${searchTerm}`)
      setResults(data.data)
      setIsSearchOpen(true)
    } catch (err: any) {
      message.error(err.response.data.message);
    }
  }, 500);

  useEffect(() => {
    checkAuthHandel();
    getAllBrand();
  }, [])



  const danhmuccontent = (
    <div style={{ display: 'flex', gap: '16px', height: '465px', overflow: 'hidden' }}>
      {/* Cột danh mục */}
      <div
        style={{
          maxWidth: '200px',
          maxHeight: '465px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#f5f5f5 transparent',
        }}
      >
        {category.map((category: any, index: any) => (
          <Button
            type="text"
            key={index}
            style={{
              color: selectedCategory === index ? 'black' : 'black',
              fontWeight: 500,
              backgroundColor: selectedCategory === index ? '#f6f9fc' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginBottom: '8px',
              padding: '10px',
              width: '100%',
              height: '40px',
              border: '#f6f9fc',
              borderRadius: '4px',
              transition: 'background-color 0.3s ease',
            }}
            onClick={() => handleCategoryClick(index, category.id)}
          >
            <img
              src={`http://localhost:4000/${category.imageUrl}`}
              alt={category.name}
              style={{ width: '35px', height: '35px', marginRight: '10px' }}
            />
            {category.name}
          </Button>
        ))}
      </div>

      {/* Cột chi tiết */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '465x',  // Đảm bảo chiều cao giới hạn
          overflowY: 'auto',   // Thêm scroll bar dọc
          backgroundColor: '#f6f9fc',
          flex: 1, // Đây để cột chi tiết chiếm không gian còn lại
          scrollbarWidth: 'thin',  // Thêm thuộc tính scroll bar tương tự
          scrollbarColor: '#f5f5f5 transparent',  // Tùy chỉnh màu cho scroll bar
        }}
      >
        <div style={{ paddingLeft: 5, marginTop: '10px' }}>
          <Button
            type="text"
            style={{
              margin: 0,
              fontWeight: 700,
              color: '#80c4e9',
              backgroundColor: 'transparent',
              borderRadius: '4px',
              border: 'transparent',
            }}
          >
            Xem tất cả {category[selectedCategory]?.name}
            <ArrowRightOutlined />
          </Button>
        </div>
        {/* Nội dung chính */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto', // Thêm scroll bar dọc cho nội dung
            scrollbarWidth: 'thin', // Tùy chỉnh chiều rộng scrollbar
            scrollbarColor: '#f5f5f5 transparent', // Tùy chỉnh màu scrollbar
            backgroundColor: '#f6f9fc',
            paddingLeft: '20px',
            paddingRight: '20px',
          }}
        >
          {/* Cột Thương hiệu */}
          <div style={{ marginBottom: '16px', maxWidth: '588px' }}>
            <h4 style={{ marginBottom: '8px', textAlign: 'left' }}>Thương hiệu</h4>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'flex-start', // Căn trái
              }}
            >
              {Brand?.map((Brand: any, index: any) => (
                <Button
                  type="text"
                  key={index}
                  style={{
                    color: 'black',
                    backgroundColor: 'transparent',
                    borderRadius: '4px',
                    border: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start', // Căn trái nội dung
                    textAlign: 'left', // Căn trái văn bản
                    flexBasis: 'calc((588px - 32px) / 5)', // Tính chiều rộng mỗi button
                    maxWidth: 'calc((588px - 32px) / 5)', // Đảm bảo vừa với hàng
                    boxSizing: 'border-box',
                  }}
                  onClick={() => router.push(`/product/brand/${Brand.id}`)}  // Gọi hàm handleBrandClick khi click vào button
                >
                  {Brand.name}
                  <ArrowRightOutlined rotate={-50} style={{ color: '#80c4e9', marginLeft: '4px' }} />
                </Button>
              ))}
            </div>
          </div>

          {/* Cột Khoảng giá */}
          <div style={{ marginBottom: '16px', maxWidth: '588px' }}>
            <h4 style={{ marginBottom: '8px', textAlign: 'left' }}>Khoảng giá</h4>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'flex-start', // Căn trái
              }}
            >
              {priceRanges.map((range, index) => (
                <Button
                  type="text"
                  key={index}
                  style={{
                    backgroundColor: 'transparent',
                    borderRadius: '4px',
                    border: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start', // Căn trái nội dung
                    textAlign: 'left', // Căn trái văn bản
                    flexBasis: 'calc((588px - 32px) / 5)', // Tính chiều rộng mỗi button
                    maxWidth: 'calc((588px - 32px) / 5)', // Đảm bảo vừa với hàng
                    boxSizing: 'border-box',
                  }}
                >
                  {range}
                  <ArrowRightOutlined rotate={-50} style={{ color: '#80c4e9', marginLeft: '4px' }} />
                </Button>
              ))}
            </div>
          </div>

          {/* Cột Nhu cầu */}
          <div style={{ marginBottom: '16px', maxWidth: '588px' }}>
            <h4 style={{ marginBottom: '8px', textAlign: 'left' }}>Nhu cầu</h4>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'flex-start', // Căn trái
              }}
            >
              {needs.map((need, index) => (
                <Button
                  type="text"
                  key={index}
                  style={{
                    backgroundColor: 'transparent',
                    borderRadius: '4px',
                    border: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start', // Căn trái nội dung
                    textAlign: 'left', // Căn trái văn bản
                    flexBasis: 'calc((588px - 32px) / 5)', // Tính chiều rộng mỗi button
                    maxWidth: 'calc((588px - 32px) / 5)', // Đảm bảo vừa với hàng
                    boxSizing: 'border-box',
                  }}
                >
                  {need}
                  <ArrowRightOutlined rotate={-50} style={{ color: '#80c4e9', marginLeft: '4px' }} />
                </Button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Cột ngoài cùng bên phải chứa 4 thẻ */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '250px',
          backgroundColor: 'white',
          maxHeight: '465px',  // Đảm bảo chiều cao giới hạn cho cột ngoài cùng
          overflowY: 'auto',   // Thêm scroll bar dọc cho cột này
          scrollbarWidth: 'thin',  // Thêm thuộc tính scroll bar tương tự
          scrollbarColor: '#f5f5f5 transparent',  // Tùy chỉnh màu cho scroll bar
        }}
      >
        <div style={{ padding: '8px', backgroundColor: '#faf4ff', borderRadius: '4px', fontWeight: 600, lineHeight: '150%', display: 'flex' }}>
          <p style={{ fontSize: '14px' }}>Trải nghiệm thực tế sản phẩm trước khi mua</p>
          <div><img src="/icon/usp-1.png" alt="" style={{ width: 80 }} /></div>
        </div>
        <div style={{ padding: '8px', backgroundColor: '#FEEECC', borderRadius: '4px', fontWeight: 600, lineHeight: '150%', display: 'flex' }}>
          <p style={{ fontSize: '14px' }}>Chuyên gia tư vấn sản phẩm</p>
          <div><img src="/icon/usp-2.png" alt="" style={{ width: 80 }} /></div>
        </div>
        <div style={{ padding: '8px', backgroundColor: '#CBE7FE', borderRadius: '4px', fontWeight: 600, lineHeight: '150%', display: 'flex' }}>
          <p style={{ fontSize: '14px' }}>Trung tâm bảo vệ quyền lợi khách hàng</p>
          <div><img src="/icon/usp-3.png" alt="" style={{ width: 80 }} /></div>
        </div>
        <div style={{ padding: '8px', backgroundColor: '#FBCFD8', borderRadius: '4px', fontWeight: 600, lineHeight: '150%', display: 'flex' }}>
          <p style={{ fontSize: '14px' }}>Của hàng bán lẻ phục vụ khách hàng lâu nhất</p>
          <div><img src="/icon/usp-4.png" alt="" style={{ width: 80 }} /></div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Header chính */}
      <Row style={{ backgroundColor: 'white', justifyContent: 'center' }}>
        <Row style={{ display: "flex", height: "80px", alignItems: "center" }}>
          <Col span={2}>
            <img
              src="/logo/logo.png"
              alt="logo"
              style={{ flexShrink: '0', height: '2.5rem', width: "80px", cursor: 'pointer' }}
              onClick={() => router.push('/home')} // Thêm sự kiện onClick
            />
          </Col>
          <Col span={7}>
            <ConfigProvider
              theme={{
                components: {
                  Input: {
                    colorBgContainer: '#f6f9fc',
                    colorBorder: '#f5f5f5',
                  }
                }
              }}>
              <Form form={form}>
                <Form.Item
                  name="search"
                  style={{ width: 350 }}
                >
                  <Search
                    size='large'
                    placeholder="Tên sản phẩm, nhu cầu hãng"
                    allowClear
                    onChange={() => getSearchData()}
                    style={{ width: 350, marginTop: '25px' }}
                    onClick={() => setIsSearchOpen(prev => !prev)}
                  />
                </Form.Item>
                {results.length > 0 && isSearchOpen == true && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '75%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #f5f5f5',
                      borderRadius: '4px',
                      zIndex: 1,
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}
                  >
                    <style>
                      {`
                        /* Custom Webkit scrollbar styles */
                        div::-webkit-scrollbar {
                          width: 8px;
                        }
                        div::-webkit-scrollbar-thumb {
                          background-color: #888;
                          border-radius: 4px;
                        }
                        div::-webkit-scrollbar-track {
                          background-color: #f5f5f5;
                        }
                      `}
                    </style>
                    {results.map((result: any, index: any) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px 20px',
                          border: '1px solid #e0e0e0',
                          cursor: 'pointer',
                          transition: 'box-shadow 0.3s, transform 0.3s'
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)')
                        }
                        onClick={() => router.push(`http://localhost:4000/product/detail/${result.id}`)}
                      >
                        <Row align="middle" gutter={[16, 16]}>
                          {/* Image */}
                          <Col flex="0 0 60px" style={{ display: 'flex', justifyContent: 'center' }}>
                            <img
                              src={`http://localhost:4000/${result.productImage}`}
                              alt={result.name}
                              style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                              }}
                            />
                          </Col>

                          {/* Content */}
                          <Col flex="1" style={{ textAlign: 'left' }}>
                            <div
                              style={{
                                fontWeight: 'bold',
                                fontSize: '16px',
                                marginBottom: '4px',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                              }}
                            >
                              {result.name}
                            </div>
                            <div
                              style={{
                                color: '#888',
                                fontSize: '14px',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                              }}
                            >
                              {result.description || 'No description available'}
                            </div>
                          </Col>
                        </Row>
                      </div>
                    ))}

                  </div>
                )}

              </Form>
            </ConfigProvider>
          </Col>
          <Col span={3}>
            <ConfigProvider
              theme={{
                components: {
                  Button: {
                    colorBorder: 'transparent',
                    defaultHoverBorderColor: 'transparent',
                    defaultHoverColor: 'black',
                    defaultShadow: '0',
                    defaultHoverBg: '#f6f9fc'
                  }
                }
              }}>
              <Button style={{ marginLeft: '30px', fontWeight: 600, border: 'transparent' }}>
                <img src="/icon/phone-call.png" alt="" style={{ width: 18 }} />1900.63.3579
              </Button>
            </ConfigProvider>
          </Col>
          <Col span={3}>
            <ConfigProvider
              theme={{
                components: {
                  Button: {
                    colorBorder: 'transparent',
                    defaultHoverBorderColor: 'transparent',
                    defaultHoverColor: 'black',
                    defaultShadow: '0',
                    defaultHoverBg: '#f6f9fc'
                  }
                }
              }}>
              <Popover content={content} title="Thông tin cửa hàng" trigger="click">
                <Button style={{ marginLeft: '20px', fontWeight: 600, border: 'transparent' }}>
                  <img src="/icon/gps.png" alt="" style={{ width: 25 }} />Địa chỉ cửa hàng
                </Button>
              </Popover>
            </ConfigProvider>
          </Col>
          <Col span={4}>
            <ConfigProvider
              theme={{
                components: {
                  Button: {
                    colorBorder: 'transparent',
                    defaultHoverBorderColor: 'transparent',
                    defaultHoverColor: 'black',
                    defaultShadow: '0',
                    defaultHoverBg: '#f6f9fc'
                  }
                }
              }}>
              <Button style={{ marginLeft: '40px', fontWeight: 600, border: 'transparent' }} onClick={() => router.push('https://www.facebook.com/tran.son.387612')}>
                <img src="/icon/online-support.png" alt="" style={{ width: 21 }} />Hỗ trợ trực tuyến
              </Button>
            </ConfigProvider>
          </Col>
          <Col span={2}>
            <ConfigProvider
              theme={{
                components: {
                  Button: {
                    colorBorder: 'transparent',
                    defaultHoverBorderColor: 'transparent',
                    defaultHoverColor: 'black',
                    defaultShadow: '0',
                    defaultHoverBg: '#f6f9fc'
                  }
                }
              }}>
              <Button
                style={{ fontWeight: 600, border: 'transparent' }}
                onClick={handleButtonClick}
              >
                <img src="/icon/news.png" alt="" style={{ width: 18 }} />
                Tin công nghệ
              </Button>

            </ConfigProvider>
          </Col>
          <Col span={2} style={{ display: 'flex', flexDirection: 'row-reverse' }}>
            <Popover
              content={popoverContent}
              trigger="click" // Hiện popover khi click
              placement="bottom" // Định vị popover ở góc phải dưới
            >
              <Button
                color="default"
                shape="circle"
                size="large"
                variant="filled"
                style={{ marginRight: '10px' }}
              >
                <img src="/icon/user.png" alt="" style={{ width: 15 }} />
              </Button>
            </Popover>
          </Col>
          <Col span={1} style={{ display: 'flex', flexDirection: 'row-reverse' }}>
            <Button color='default' shape='circle' size='large' variant='filled' onClick={() => { router.push('/shoppingCart') }}>
              <img src="/icon/grocery-store.png" alt="" style={{ width: 17 }} />
            </Button>
          </Col>
        </Row>
      </Row>

      <Row style={{ backgroundColor: 'white', justifyContent: 'center', marginTop: '2px' }}>
        <Row
          style={{
            paddingTop: '10px',
            paddingBottom: '10px',
            display: 'flex',
            height: '80px',
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {/* Nút "Danh Mục" */}
          <Col span={2.5} style={{ display: 'flex', flexDirection: 'row-reverse' }}>
            <Popover content={danhmuccontent} arrow={false} placement='bottomLeft' trigger={'click'} overlayInnerStyle={{ marginTop: '10px' }} >
              <Button color='default' variant='text' style={{ height: '60px', fontWeight: 600, borderRadius: 8 }}>
                <img src="/icon/options-lines.png" alt="" style={{ width: 17 }} />Danh Mục
              </Button>
            </Popover>
          </Col>

          {/* Carousel cho danh sách danh mục */}
          <Col span={19} style={{ position: 'relative' }}>
            <Carousel
              ref={carouselRef}  // Gán ref cho Carousel
              dots={false}
              slidesToShow={6}
              slidesToScroll={5}
              infinite={false}
            >
              {category.map((category: any, index: any) => (
                <div
                  key={index}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <ConfigProvider
                    theme={{
                      components: {
                        Button: {
                          colorBorder: 'transparent',
                          defaultHoverBorderColor: 'transparent',
                          defaultHoverColor: 'black',
                          defaultShadow: '0',
                          defaultHoverBg: '#f5f5f5'
                        }
                      }
                    }}>
                    <Button
                      style={{
                        fontWeight: 500,
                        border: 'transparent',
                        borderRadius: '8px',
                        height: 60,
                        width: '100%',
                        maxWidth: '150px',
                        display: 'flex', // Để sắp xếp ảnh và text theo chiều ngang
                        alignItems: 'center', // Canh chỉnh ảnh và text
                        justifyContent: 'center', // Canh giữa nội dung
                      }}
                      onClick={() => router.push(`http://localhost:4000/product/category/${category.id}`)}  // Gọi hàm handleCategoryClick khi click vào button
                    >
                      <img
                        src={`http://localhost:4000/${category.imageUrl}`}  // Đường dẫn đến ảnh từ localhost:4000
                        alt={category.name}   // Thêm alt text cho ảnh
                        style={{ width: '45px', marginRight: '8px' }} // Đặt kích thước ảnh và khoảng cách với text
                      />
                      {category.name}
                    </Button>
                  </ConfigProvider>
                </div>
              ))}
            </Carousel>
          </Col>

          {/* Nút mũi tên bên ngoài carousel, ở bên phải */}
          <Col span={2} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type='text'
              shape="circle"
              onClick={handlePrev}  // Gọi hàm handlePrev
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                borderColor: 'transparent',
                border: 'transparent'
              }}
            >
              <LeftOutlined />
            </Button>
            <Button
              type='text'
              shape="circle"
              onClick={handleNext}  // Gọi hàm handleNext
              style={{
                marginLeft: '10px',
                borderRadius: '8px',
                backgroundColor: 'white',
                borderColor: 'transparent',
                border: 'transparent'
              }}
            >
              <RightOutlined />
            </Button>
          </Col>
        </Row>
      </Row>
    </>
  );
};

export default HeaderPage;
